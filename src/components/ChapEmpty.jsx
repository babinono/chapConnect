import ChapAvatar from './ChapAvatar';

// Empty state with a Chap in it: one plain sentence, one action at most.
export default function ChapEmpty({ avatar = 'blue:whoa', title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <ChapAvatar avatar={avatar} size={72} className="border border-rule" title="" />
      <p className="mt-4 font-heading text-lg font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-ink-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
