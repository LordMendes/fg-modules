"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { isCategoryKey, type CategoryKey } from "@/lib/categories";

export type ListSummary = {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: Date;
};

export type SavedListItemView = {
  id: string;
  category: CategoryKey;
  entitySlug: string;
  entityName: string;
  createdAt: Date;
};

export type ListWithItems = {
  id: string;
  name: string;
  items: SavedListItemView[];
};

export type ListActionResult = {
  success: boolean;
  error?: string;
};

function validateListName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "List name is required";
  if (trimmed.length > 64) return "List name must be 64 characters or fewer";
  return null;
}

async function getOwnedList(listId: string, userId: string) {
  return prisma.savedList.findFirst({
    where: { id: listId, userId },
  });
}

export async function getUserLists(): Promise<ListSummary[]> {
  const user = await requireCurrentUser();
  const lists = await prisma.savedList.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    itemCount: list._count.items,
    updatedAt: list.updatedAt,
  }));
}

export async function getListWithItems(listId: string): Promise<ListWithItems | null> {
  const user = await requireCurrentUser();
  const list = await prisma.savedList.findFirst({
    where: { id: listId, userId: user.id },
    include: {
      items: {
        orderBy: [{ category: "asc" }, { entityName: "asc" }],
      },
    },
  });

  if (!list) return null;

  return {
    id: list.id,
    name: list.name,
    items: list.items
      .filter((item) => isCategoryKey(item.category))
      .map((item) => ({
        id: item.id,
        category: item.category as CategoryKey,
        entitySlug: item.entitySlug,
        entityName: item.entityName,
        createdAt: item.createdAt,
      })),
  };
}

export async function createList(name: string): Promise<ListActionResult & { list?: ListSummary }> {
  const user = await requireCurrentUser();
  const nameError = validateListName(name);
  if (nameError) return { success: false, error: nameError };

  const trimmed = name.trim();
  const existing = await prisma.savedList.findUnique({
    where: {
      userId_name: { userId: user.id, name: trimmed },
    },
  });
  if (existing) {
    return { success: false, error: "You already have a list with this name" };
  }

  const list = await prisma.savedList.create({
    data: {
      userId: user.id,
      name: trimmed,
    },
    include: {
      _count: { select: { items: true } },
    },
  });

  return {
    success: true,
    list: {
      id: list.id,
      name: list.name,
      itemCount: list._count.items,
      updatedAt: list.updatedAt,
    },
  };
}

export async function renameList(listId: string, name: string): Promise<ListActionResult> {
  const user = await requireCurrentUser();
  const nameError = validateListName(name);
  if (nameError) return { success: false, error: nameError };

  const owned = await getOwnedList(listId, user.id);
  if (!owned) return { success: false, error: "List not found" };

  const trimmed = name.trim();
  const duplicate = await prisma.savedList.findFirst({
    where: {
      userId: user.id,
      name: trimmed,
      NOT: { id: listId },
    },
  });
  if (duplicate) {
    return { success: false, error: "You already have a list with this name" };
  }

  await prisma.savedList.update({
    where: { id: listId },
    data: { name: trimmed },
  });

  return { success: true };
}

export async function deleteList(listId: string): Promise<ListActionResult> {
  const user = await requireCurrentUser();
  const owned = await getOwnedList(listId, user.id);
  if (!owned) return { success: false, error: "List not found" };

  await prisma.savedList.delete({ where: { id: listId } });
  return { success: true };
}

export async function addListItem(input: {
  listId: string;
  category: string;
  entitySlug: string;
  entityName: string;
}): Promise<ListActionResult> {
  const user = await requireCurrentUser();

  if (!isCategoryKey(input.category)) {
    return { success: false, error: "Invalid category" };
  }

  const owned = await getOwnedList(input.listId, user.id);
  if (!owned) return { success: false, error: "List not found" };

  const name = input.entityName.trim();
  if (!name) return { success: false, error: "Entity name is required" };

  await prisma.savedListItem.upsert({
    where: {
      listId_category_entitySlug: {
        listId: input.listId,
        category: input.category,
        entitySlug: input.entitySlug,
      },
    },
    create: {
      listId: input.listId,
      category: input.category,
      entitySlug: input.entitySlug,
      entityName: name,
    },
    update: {
      entityName: name,
    },
  });

  await prisma.savedList.update({
    where: { id: input.listId },
    data: { updatedAt: new Date() },
  });

  return { success: true };
}

export async function removeListItem(listId: string, itemId: string): Promise<ListActionResult> {
  const user = await requireCurrentUser();
  const owned = await getOwnedList(listId, user.id);
  if (!owned) return { success: false, error: "List not found" };

  const item = await prisma.savedListItem.findFirst({
    where: { id: itemId, listId },
  });
  if (!item) return { success: false, error: "Item not found" };

  await prisma.savedListItem.delete({ where: { id: itemId } });
  await prisma.savedList.update({
    where: { id: listId },
    data: { updatedAt: new Date() },
  });

  return { success: true };
}
