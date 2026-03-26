"use client";

export function StudentZoneCard() {
  return (
    <div className="border-2 border-dashed border-emerald-800/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center group h-64">
      <div className="w-12 h-12 rounded-full bg-emerald-900/40 flex items-center justify-center mb-4 text-xl">
        🎓
      </div>
      <h4 className="font-bold text-emerald-600">
        学生能力专区
      </h4>
      <p className="text-[10px] text-slate-600 mt-2 px-4 leading-relaxed">
        专属成长路径 · 实战挑战加权
      </p>
    </div>
  );
}
