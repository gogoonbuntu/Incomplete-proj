'use client';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-lg shadow">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">페이지를 찾을 수 없습니다</h2>
        <p className="text-gray-600 mb-6">요청하신 페이지가 존재하지 않거나 삭제되었을 수 있습니다.</p>
        <a 
          href="/" 
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}
