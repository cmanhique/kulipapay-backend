import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
} from '@mui/material'
import {
  People,
  Store,
  AccountBalanceWallet,
  AttachMoney,
} from '@mui/icons-material'
import api from '../../services/api'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalAgents: 0,
    totalVolume: 0,
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/stats')
      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error)
      if (error.response?.status === 401) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          A carregar dashboard...
        </Typography>
      </Box>
    )
  }

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography color="textSecondary" variant="caption">
            {title}
          </Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </CardContent>
    </Card>
  )

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📊 Dashboard</Typography>
        <Button variant="contained" color="error" onClick={handleLogout}>
          Sair
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Utilizadores"
            value={stats.totalUsers || 0}
            icon={<People />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Merchants"
            value={stats.totalMerchants || 0}
            icon={<Store />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Agents"
            value={stats.totalAgents || 0}
            icon={<AccountBalanceWallet />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Volume Total"
            value={`${(stats.totalVolume || 0).toLocaleString()} MZN`}
            icon={<AttachMoney />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          ✅ Sistema operacional
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Autenticação JWT + 2FA ativa • Sessão segura
        </Typography>
      </Box>
    </Box>
  )
}

export default Dashboard
