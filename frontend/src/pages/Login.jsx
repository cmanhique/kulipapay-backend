import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material'
import useAuth from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('admin@kulipa.com')
  const [password, setPassword] = useState('Admin@123')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('login')
  const [kpId, setKpId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const { login, verifyOTP } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await login(email, password)
      
      if (result.success && result.requiresTwoFactor) {
        setKpId(result.kp_id)
        setStep('otp')
        setMessage('📱 ' + result.message)
      } else if (result.success) {
        navigate('/admin')
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await verifyOTP(kpId, otp)
      
      if (result.success) {
        navigate('/admin')
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message || 'Erro ao verificar OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
    >
      <Card sx={{ maxWidth: 420, width: '100%', p: 3 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
            🏦 KulipaPay Admin
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" gutterBottom>
            {step === 'login' ? 'Faça login para aceder ao painel' : 'Digite o código OTP recebido por email'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}

          {step === 'login' ? (
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <TextField
                fullWidth
                label="Código OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Digite os 6 dígitos"
                margin="normal"
                required
                inputProps={{ 
                  maxLength: 6,
                  style: { 
                    fontSize: '24px', 
                    letterSpacing: '8px', 
                    textAlign: 'center' 
                  }
                }}
                disabled={loading}
                autoFocus
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verificar OTP'}
              </Button>
              <Button
                fullWidth
                variant="text"
                size="small"
                onClick={() => {
                  setStep('login')
                  setOtp('')
                  setError('')
                  setMessage('')
                }}
                sx={{ mt: 1 }}
                disabled={loading}
              >
                ← Voltar e tentar novamente
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
