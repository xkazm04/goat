type Props = {
    handleSubmit: (e: React.FormEvent) => void;
    title: string;
    setTitle: (value: string) => void;
    isSubmitting: boolean;
}

const AddItemContent = ({handleSubmit, title, setTitle, isSubmitting}: Props) => {
    return <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-6">
            <label
                htmlFor="item-title"
                className="block text-sm font-medium text-slate-300 mb-2"
            >
                Item Name
            </label>
            <input
                id="item-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter the legendary item name..."
                autoFocus
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl text-slate-200 placeholder-slate-500 transition-all duration-200 focus:outline-none disabled:opacity-50"
                style={{
                    background: `
                          linear-gradient(135deg, 
                            rgba(30, 41, 59, 0.9) 0%,
                            rgba(51, 65, 85, 0.95) 100%
                          )
                        `,
                    border: '2px solid rgba(71, 85, 105, 0.4)',
                    boxShadow: `
                          0 2px 4px rgba(0, 0, 0, 0.2),
                          inset 0 1px 0 rgba(148, 163, 184, 0.1)
                        `
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                    e.target.style.boxShadow = `
                          0 0 0 3px rgba(59, 130, 246, 0.2),
                          0 2px 4px rgba(0, 0, 0, 0.2),
                          inset 0 1px 0 rgba(148, 163, 184, 0.1)
                        `;
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                    e.target.style.boxShadow = `
                          0 2px 4px rgba(0, 0, 0, 0.2),
                          inset 0 1px 0 rgba(148, 163, 184, 0.1)
                        `;
                }}
            />
        </div>
    </form>
}

export default AddItemContent;