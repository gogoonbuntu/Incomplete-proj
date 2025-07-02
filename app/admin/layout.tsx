import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">관리자 페이지</h1>
      <div>{children}</div>
    </div>
  );
}
