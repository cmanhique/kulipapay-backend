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
  Stack,
} from '@mui/material'
import api from '../../services/api'

const Kyc = () => {
  const [kycRequests, setKycRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKyc()
  }, [])

  const fetchKyc = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/kyc/pending')
      if (response.data.success) {
        setKycRequests(response.data.data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar KYC:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/kyc/${id}/${action}`)
      fetchKyc()
    } catch (error) {
      console.error('Erro ao processar KYC:', error)
    }
  }

  if (loading) return <LinearProgress />

  return (
    <Box>
      <Typography variant="h5" gutterBottom>📋 Verificações KYC</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Utilizador</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {kycRequests.map((kyc) => (
              <TableRow key={kyc.id}>
                <TableCell>{kyc.fullName}</TableCell>
                <TableCell>{kyc.documentType}</TableCell>
                <TableCell>
                  <Chip 
                    label={kyc.status} 
                    color={kyc.status === 'PENDING' ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(kyc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      size="small" 
                      color="success"
                      onClick={() => handleAction(kyc.id, 'approve')}
                    >
                      Aprovar
                    </Button>
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => handleAction(kyc.id, 'reject')}
                    >
                      Rejeitar
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default Kyc
