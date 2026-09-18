import React from 'react';
import Header from './_components/Header';
import Footer from './_components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

function DashboardLayout({children}) {
  return (
    <ProtectedRoute>
      <div>
        <Header />
        <div>
          {children}
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  )
}

export default DashboardLayout