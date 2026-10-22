import { licenseNoticeForTool } from "@/lib/tool-licenses";

export function ToolLicenseFooter({ toolKey }: { toolKey: string }) {
  const notice = licenseNoticeForTool(toolKey);
  if (!notice) return null;

  return (
    <footer className="tool-license-footer">
      <p>
        {notice.parts.map((part, index) =>
          part.type === "link" ? (
            <a
              key={`${part.href}-${index}`}
              href={part.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {part.label}
            </a>
          ) : (
            <span key={`${part.value}-${index}`}>{part.value}</span>
          ),
        )}
      </p>
    </footer>
  );
}
