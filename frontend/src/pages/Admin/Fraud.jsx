import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  LinearProgress,
  Button,
} from '@mui/material'
import api from '../../services/api'

const Fraud = () => {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/fraud/alerts')
      if (response.data.success) {
        setAlerts(response.data.data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar alertas:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (id) => {
    try {
      await api.post(`/admin/fraud/resolve/${id}`)
      fetchAlerts()
    } catch (error) {
      console.error('Erro ao resolver alerta:', error)
    }
  }

  if (loading) return <LinearProgress />

  return (
    <Box>
      <Typography variant="h5" gutterBottom>🚨 Alertas de Fraude</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Severidade</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>{alert.type}</TableCell>
                <TableCell>
                  <Chip 
                    label={alert.severity} 
                    color={alert.severity === 'HIGH' ? 'error' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{alert.description}</TableCell>
                <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => resolveAlert(alert.id)}>
                    Resolver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default Fraud
