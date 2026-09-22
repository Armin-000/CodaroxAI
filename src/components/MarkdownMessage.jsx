import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        pre: (props) => <pre className="code-block" {...props} />,
        code: ({ className, children, ...props }) => {
          const multiline = String(children).includes("\n") || className;
          return multiline ? (
            <code className={className} {...props}>
              {children}
            </code>
          ) : (
            <code className="inline-code" {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
