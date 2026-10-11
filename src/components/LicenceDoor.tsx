export const LicenceDoor: React.FC = () => {
  return (
    <div className="mb-4 bg-[#070e1c] border border-cyan-800/80 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-slate-100 mb-2">Licensing</h3>
      <p className="text-xs text-slate-400">Status: Active (Tier: PRO)</p>
      <p className="text-xs text-slate-400">Expiry: 2099-12-31</p>
      <div className="flex gap-2 mt-3">
        <button className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200">Activate New Key</button>
        <button className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200">Sync Licence</button>
      </div>
    </div>
  );
};
