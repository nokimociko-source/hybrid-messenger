import React, { useMemo } from 'react';
import { MarkdownParser, FormattedSegment as FormattedSegmentType } from '../utils/markdownParser';

interface FormattedMessageProps {
  content: string;
  style?: React.CSSProperties;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, style }) => {
  const segments = useMemo(() => MarkdownParser.parse(content), [content]);

  return (
    <div style={{ ...style, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
      {segments.map((segment, index) => (
        <FormattedSegmentComponent key={index} segment={segment} />
      ))}
    </div>
  );
};

interface FormattedSegmentComponentProps {
  segment: FormattedSegmentType;
}

const FormattedSegmentComponent: React.FC<FormattedSegmentComponentProps> = ({ segment }) => {
  switch (segment.type) {
    case 'bold':
      return <strong style={{ fontWeight: 'bold' }}>{segment.content}</strong>;

    case 'italic':
      return <em style={{ fontStyle: 'italic' }}>{segment.content}</em>;

    case 'code':
      return (
        <code
          style={{
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9em',
            color: '#00f2ff',
          }}
        >
          {segment.content}
        </code>
      );

    case 'code_block':
      return (
        <pre
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '12px',
            borderRadius: '8px',
            overflow: 'auto',
            margin: '8px 0',
            border: '1px solid rgba(0, 242, 255, 0.2)',
          }}
        >
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: '0.9em',
              color: '#00f2ff',
              display: 'block',
            }}
          >
            {segment.content}
          </code>
        </pre>
      );

    case 'strikethrough':
      return (
        <del style={{ textDecoration: 'line-through', opacity: 0.7 }}>{segment.content}</del>
      );

    case 'link':
      return (
        <a
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#00f2ff',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {segment.content}
        </a>
      );

    case 'mention':
      return (
        <span
          style={{
            color: '#00f2ff',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          @{segment.content}
        </span>
      );

    default:
      return <span>{segment.content}</span>;
  }
};
