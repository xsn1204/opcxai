"use client";

import { useState } from "react";

export function StudentZoneCard() {
  const [show, setShow] = useState(false);

  return (
    <>
      <div
        onClick={() => setShow(true)}
        className="border-2 border-dashed border-emerald-800/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-emerald-500 transition-all h-64"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-900/40 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors text-xl">
          🎓
        </div>
        <h4 className="font-bold text-emerald-600 group-hover:text-emerald-400 transition-colors">
          学生能力专区
        </h4>
        <p className="text-[10px] text-slate-600 mt-2 px-4 leading-relaxed">
          专属成长路径 · 实战挑战加权
        </p>
      </div>

      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
          onClick={() => setShow(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 text-2xl">
              🎓
            </div>
            <h3 className="text-white font-bold text-base mb-2">学生能力专区</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              专属成长路径与实战挑战加权功能即将上线，敬请期待。
            </p>
            <button
              onClick={() => setShow(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
