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
} from '@mui/material'
import api from '../../services/api'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/transactions')
      if (response.data.success) {
        setTransactions(response.data.data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      REJECTED: 'error',
      EXPIRED: 'default',
      REFUNDED: 'info',
    }
    return colors[status] || 'default'
  }

  if (loading) return <LinearProgress />

  return (
    <Box>
      <Typography variant="h5" gutterBottom>📊 Transações</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>De</TableCell>
              <TableCell>Para</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{tx.id?.slice(0, 8)}</TableCell>
                <TableCell>{tx.fromAccountId?.slice(0, 8)}</TableCell>
                <TableCell>{tx.toAccountId?.slice(0, 8)}</TableCell>
                <TableCell align="right">{tx.amount} MZN</TableCell>
                <TableCell>
                  <Chip 
                    label={tx.status} 
                    color={getStatusColor(tx.status)} 
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default Transactions
