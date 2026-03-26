"use client";

export function FreeSimCard() {
  return (
    <div className="border-2 border-dashed border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center group h-64">
      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-xl">
        ✍️
      </div>
      <h4 className="font-bold text-slate-500">
        自由拟真模式
      </h4>
      <p className="text-[10px] text-slate-600 mt-2 px-4 leading-relaxed">
        上传自己的业务命题，练习如何更好地与 AI 协同工作。
      </p>
    </div>
  );
}
