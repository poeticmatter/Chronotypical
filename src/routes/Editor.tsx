import { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { EditorFragment } from '../store/useEditorStore';

export function Editor() {
  const store = useEditorStore();

  const { fetchFragments } = store;
  useEffect(() => {
    fetchFragments();
  }, [fetchFragments]);

  const sortedFragments = [...store.fragments].sort((a, b) =>
    a.metadata.chronological_order - b.metadata.chronological_order
  );

  const activeFragment = store.fragments.find(f => f.id === store.activeFragmentId);

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans">
      {/* Left Pane: Roster */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Narrative Roster</h2>
          <button
            onClick={store.createTemporaryFragment}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            disabled={store.fragments.some(f => f.id === 'NEW')}
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedFragments.map(frag => (
            <div
              key={frag.id}
              onClick={() => store.setActiveFragment(frag.id)}
              className={`p-3 rounded-md cursor-pointer transition-colors text-sm ${
                store.activeFragmentId === frag.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-100 border border-transparent'
              }`}
            >
              <div className="font-semibold text-gray-800 flex items-center justify-between">
                <span>{frag.metadata.title || frag.metadata.id}</span>
                <div className="flex gap-1">
                   {frag.metadata.warnings.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title="Has warnings" />}
                   {frag.metadata.requires.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-400" title="Has dependencies" />}
                </div>
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {frag.metadata.id} | Order: {frag.metadata.chronological_order} | Pool: {frag.metadata.required_pool_count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Editor Form */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {activeFragment ? (
          <EditorForm
            key={activeFragment.id} // force re-mount when changing fragments
            fragment={activeFragment}
            allFragments={sortedFragments}
            onSave={async (metadata, content) => {
               await store.saveFragment(metadata.id, metadata, content);
               if (activeFragment.id === 'NEW') {
                  store.setActiveFragment(metadata.id);
               }
            }}
            onDelete={() => store.deleteFragment(activeFragment.id)}
            isSaving={store.isSaving}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a fragment from the roster to edit.
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EditorForm({ fragment, allFragments, onSave, onDelete, isSaving }: { fragment: EditorFragment, allFragments: EditorFragment[], onSave: (m: any, c: string) => void, onDelete: () => void, isSaving: boolean }) {
  const [metadata, setMetadata] = useState(fragment.metadata);
  const [content, setContent] = useState(fragment.content);
  const [searchDep, setSearchDep] = useState('');

  const availableDeps = allFragments.filter(f => f.metadata.id !== metadata.id && f.id !== 'NEW');

  const filteredDeps = availableDeps.filter(f =>
    f.metadata.id.toLowerCase().includes(searchDep.toLowerCase())
  );

  const toggleDependency = (depId: string) => {
    setMetadata(prev => {
      const isSelected = prev.requires.includes(depId);
      return {
        ...prev,
        requires: isSelected
          ? prev.requires.filter(id => id !== depId)
          : [...prev.requires, depId]
      };
    });
  };

  const handleListInput = (key: 'tags' | 'warnings', value: string) => {
     const arr = value.split(',').map(s => s.trim()).filter(Boolean);
     setMetadata(prev => ({ ...prev, [key]: arr }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {metadata.title || metadata.id}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm(`Delete "${metadata.title || metadata.id}"? This cannot be undone.`)) {
                onDelete();
              }
            }}
            disabled={isSaving}
            className="border border-red-300 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => onSave(metadata, content)}
            disabled={isSaving}
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Fragment'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={metadata.title}
            onChange={e => setMetadata(m => ({ ...m, title: e.target.value }))}
            placeholder="Fragment title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chronological Order</label>
          <input
            type="number"
            value={metadata.chronological_order}
            onChange={e => setMetadata(m => ({ ...m, chronological_order: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Required Pool Count</label>
          <input
            type="number"
            value={metadata.required_pool_count}
            onChange={e => setMetadata(m => ({ ...m, required_pool_count: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={metadata.tags.join(', ')}
            onChange={e => handleListInput('tags', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Warnings (comma separated)</label>
          <input
            type="text"
            value={metadata.warnings.join(', ')}
            onChange={e => handleListInput('warnings', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Requires (Dependencies)</label>
          <div className="border border-gray-300 rounded-md p-3 bg-gray-50 h-48 flex flex-col">
            <input
              type="text"
              placeholder="Search dependencies..."
              value={searchDep}
              onChange={e => setSearchDep(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 text-sm focus:ring-1 focus:ring-blue-500"
            />
            <div className="overflow-y-auto flex-1 space-y-2">
              {filteredDeps.map(dep => (
                <label key={dep.metadata.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={metadata.requires.includes(dep.metadata.id)}
                    onChange={() => toggleDependency(dep.metadata.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={metadata.requires.includes(dep.metadata.id) ? 'font-semibold' : ''}>
                    {dep.metadata.id} (Order: {dep.metadata.chronological_order})
                  </span>
                </label>
              ))}
              {filteredDeps.length === 0 && <div className="text-gray-400 text-sm italic">No matching fragments</div>}
            </div>
          </div>
        </div>

        <div className="col-span-2 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Body (MDX)</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md h-64 font-mono text-sm focus:ring-1 focus:ring-blue-500"
            placeholder="Write the narrative here. Use {props.partner_name} and {props.protagonist_name} for dynamic variables."
          />
        </div>
      </div>
    </div>
  );
}
