import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteComment, fetchComments, postComment, searchUsers, type IdeaComment, type MentionUser } from '../utils/ideasApi';
import { getUser } from '../utils/auth';
import { showError } from '../utils/notifications';

function buildTree(comments: IdeaComment[]) {
    const byId = new Map<number, IdeaComment & { children: IdeaComment[] }>();
    const roots: (IdeaComment & { children: IdeaComment[] })[] = [];
    for (const c of comments) byId.set(c.id, { ...c, children: [] });
    for (const c of comments) {
        const node = byId.get(c.id)!;
        if (c.parentId && byId.get(c.parentId)) {
            byId.get(c.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

export default function Comments({ ideaId }: { ideaId: number | string }) {
    const [comments, setComments] = useState<IdeaComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState<number | null>(null);
    const [posting, setPosting] = useState(false);

    const me = getUser();

    async function load() {
        try {
            setLoading(true);
            setError(null);
            const list = await fetchComments(ideaId);
            setComments(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load comments');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ideaId]);

    async function handlePost(parentId?: number | null) {
        if (!text.trim()) return;
        try {
            setPosting(true);
            const created = await postComment(ideaId, { text, parentId: parentId ?? replyTo });
            setComments((prev) => [...prev, created]);
            setText('');
            setReplyTo(null);
        } catch (e) {
            showError('Failed to post comment', e instanceof Error ? e.message : 'Unknown error occurred');
        } finally {
            setPosting(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Delete this comment?')) return;
        try {
            await deleteComment(id);
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch (e) {
            showError('Failed to delete comment', e instanceof Error ? e.message : 'Unknown error occurred');
        }
    }

    // Mentions autocomplete
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        let active = true;
        async function run() {
            if (mentionQuery.length < 1) {
                setMentionResults([]);
                return;
            }
            try {
                const res = await searchUsers(mentionQuery, 6);
                if (active) setMentionResults(res);
            } catch {}
        }
        run();
        return () => {
            active = false;
        };
    }, [mentionQuery]);

    function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const val = e.target.value;
        setText(val);
        const idx = val.lastIndexOf('@');
        if (idx >= 0) {
            const after = val.slice(idx + 1);
            const space = after.search(/\s/);
            const token = space === -1 ? after : after.slice(0, space);
            if (token.length >= 1) {
                setMentionQuery(token);
                setShowMentions(true);
                return;
            }
        }
        setShowMentions(false);
        setMentionQuery('');
    }

    function insertMention(name: string) {
        const el = textareaRef.current;
        if (!el) return;
        const val = text;
        const idx = val.lastIndexOf('@');
        const before = val.slice(0, idx + 1);
        const afterAt = val.slice(idx + 1);
        const space = afterAt.search(/\s/);
        const tail = space === -1 ? '' : afterAt.slice(space);
        const next = `${before}${name}${tail} `;
        setText(next);
        setShowMentions(false);
        setMentionQuery('');
        // restore caret
        requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = (before + name).length + 1 + (tail ? tail.length : 0);
            el.focus();
        });
    }

    const tree = useMemo(() => buildTree(comments), [comments]);

    return (
        <div className="panel">
            <h2 className="text-lg font-bold mb-4">Comments ({comments.length})</h2>
            {/* New comment */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Add a comment</label>
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={onTextChange}
                        rows={3}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Write a comment... Use @ to mention someone"
                    />
                    {showMentions && mentionResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-80 max-w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
                            {mentionResults.map((u) => (
                                <button key={u.id} type="button" onClick={() => insertMention(u.name)} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <div className="font-medium">{u.name}</div>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-2 flex gap-2">
                    <button className="btn btn-primary" onClick={() => handlePost(null)} disabled={posting || !text.trim()}>
                        Post
                    </button>
                    {replyTo && (
                        <button className="btn btn-outline" onClick={() => setReplyTo(null)}>
                            Cancel reply
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {tree.map((c) => (
                    <CommentNode
                        key={c.id}
                        node={c}
                        meId={me?.id ? Number(me.id) : undefined}
                        onReply={(id) => setReplyTo(id)}
                        onDelete={handleDelete}
                        onSubmitReply={(txt, pid) => {
                            setText(txt);
                            setReplyTo(pid);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function CommentNode({
    node,
    meId,
    onReply,
    onDelete,
    onSubmitReply,
}: {
    node: IdeaComment & { children?: IdeaComment[] };
    meId?: number;
    onReply: (id: number) => void;
    onDelete: (id: number) => void;
    onSubmitReply: (text: string, parentId: number) => void;
}) {
    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState('');

    function submit() {
        if (!replyText.trim()) return;
        onSubmitReply(`@${node.userName} ${replyText}`.trim(), node.id);
        setReplyText('');
        setShowReply(false);
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-medium">{node.userName}</div>
                    <div className="text-xs text-gray-500">{new Date(node.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <button
                        className="text-primary hover:underline"
                        onClick={() => {
                            onReply(node.id);
                            setShowReply(true);
                        }}
                    >
                        Reply
                    </button>
                    {meId === node.userId && (
                        <button className="text-red-600 hover:underline" onClick={() => onDelete(node.id)}>
                            Delete
                        </button>
                    )}
                </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">{node.text}</p>
            {showReply && (
                <div className="mt-2">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={`Reply to ${node.userName}`}
                    />
                    <div className="mt-2 flex gap-2">
                        <button className="btn btn-primary" onClick={submit}>
                            Post reply
                        </button>
                        <button className="btn btn-outline" onClick={() => setShowReply(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {node.children && node.children.length > 0 && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {node.children.map((child) => (
                        <CommentNode key={child.id} node={child} meId={meId} onReply={onReply} onDelete={onDelete} onSubmitReply={onSubmitReply} />
                    ))}
                </div>
            )}
        </div>
    );
}
