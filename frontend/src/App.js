import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

import Login from './pages/Login'
import Dashboard from './pages/Admin/Dashboard'
import Users from './pages/Admin/Users'
import Transactions from './pages/Admin/Transactions'
import Fraud from './pages/Admin/Fraud'
import Kyc from './pages/Admin/Kyc'
import Layout from './components/Admin/Layout'

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
})

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin" element={
            <PrivateRoute>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          } />
          <Route path="/admin/users" element={
            <PrivateRoute>
              <Layout><Users /></Layout>
            </PrivateRoute>
          } />
          <Route path="/admin/transactions" element={
            <PrivateRoute>
              <Layout><Transactions /></Layout>
            </PrivateRoute>
          } />
          <Route path="/admin/fraud" element={
            <PrivateRoute>
              <Layout><Fraud /></Layout>
            </PrivateRoute>
          } />
          <Route path="/admin/kyc" element={
            <PrivateRoute>
              <Layout><Kyc /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
