import type { ToolFaq } from "@/lib/tool-faqs";

export function ToolExplainer({ faqs }: { faqs: ToolFaq[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="tool-explainer" aria-labelledby="tool-explainer-heading">
      <h2 id="tool-explainer-heading">How it works</h2>
      {faqs.map((faq) => (
        <article key={faq.question}>
          <h3>{faq.question}</h3>
          <p>{faq.answer}</p>
        </article>
      ))}
    </section>
  );
}
