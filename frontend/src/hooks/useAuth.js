import { useState, useEffect } from 'react'
import api from '../services/api'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (err) {
      console.error('Erro ao buscar utilizador:', err)
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    } finally {
      setLoading(false)
    }
  }

  const login = async (identifier, password) => {
    try {
      const response = await api.post('/auth/login', { identifier, password })
      
      // Se precisar de 2FA
      if (response.data.requiresTwoFactor) {
        return { 
          success: true, 
          requiresTwoFactor: true, 
          kp_id: response.data.kp_id,
          message: 'Código OTP enviado para o email'
        }
      }
      
      // Se tiver token direto
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        await fetchUser()
        return { success: true, user: response.data.user }
      }
      
      return { success: false, message: 'Resposta inválida do servidor' }
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Erro ao fazer login' 
      }
    }
  }

  const verifyOTP = async (kp_id, code) => {
    try {
      const response = await api.post('/auth/otp/verify', { kp_id, code })
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        await fetchUser()
        return { success: true, user: response.data.user }
      }
      
      return { success: false, message: 'Código OTP inválido' }
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Código OTP inválido ou expirado' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
    window.location.href = '/login'
  }

  return { user, loading, error, login, verifyOTP, logout }
}

export default useAuth
