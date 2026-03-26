"use client";

import { useState } from "react";

export function FreeSimCard() {
  const [show, setShow] = useState(false);

  return (
    <>
      <div
        onClick={() => setShow(true)}
        className="border-2 border-dashed border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-500 transition-all h-64"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors text-xl">
          ✍️
        </div>
        <h4 className="font-bold text-slate-500 group-hover:text-white transition-colors">
          自由拟真模式
        </h4>
        <p className="text-[10px] text-slate-600 mt-2 px-4 leading-relaxed">
          上传自己的业务命题，练习如何更好地与 AI 协同工作。
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
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5 text-2xl">
              🚧
            </div>
            <h3 className="text-white font-bold text-base mb-2">功能开发中</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              自由拟真模式即将开放，敬请期待。
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
