import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  TextField,
  InputAdornment,
  LinearProgress,
  Button,
} from '@mui/material'
import {
  Search,
  Block,
  CheckCircle,
  Refresh,
} from '@mui/icons-material'
import axios from 'axios'
import Layout from '../../components/Admin/Layout'

const API_URL = 'http://localhost:3000/api'

const Users = () => {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const getToken = () => localStorage.getItem('token')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = getToken()
      const response = await axios.get(`${API_URL}/admin/users`, {
        params: { page: pagination.page, limit: pagination.limit, search, role: roleFilter },
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data.data.users)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, search, roleFilter])

  const handleToggleBlock = async (kpId) => {
    try {
      const token = getToken()
      await axios.post(`${API_URL}/admin/users/${kpId}/toggle-block`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsers()
    } catch (error) {
      console.error('Error toggling block:', error)
    }
  }

  const handleRoleChange = async (kpId, newRole) => {
    try {
      const token = getToken()
      await axios.patch(`${API_URL}/admin/users/${kpId}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  if (loading) {
    return (
      <Layout>
        <LinearProgress />
      </Layout>
    )
  }

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">👥 Utilizadores</Typography>
        <IconButton onClick={fetchUsers}>
          <Refresh />
        </IconButton>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Buscar por nome, email, kp_id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="USER">USER</MenuItem>
            <MenuItem value="MERCHANT">MERCHANT</MenuItem>
            <MenuItem value="AGENT">AGENT</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>KP ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.kp_id}>
                <TableCell>{user.kp_id}</TableCell>
                <TableCell>{user.name || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                  <FormControl size="small">
                    <Select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.kp_id, e.target.value)}
                      sx={{ minWidth: 100 }}
                    >
                      <MenuItem value="USER">USER</MenuItem>
                      <MenuItem value="MERCHANT">MERCHANT</MenuItem>
                      <MenuItem value="AGENT">AGENT</MenuItem>
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    size="small"
                    color={user.status === 'ACTIVE' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  {user.wallet?.balance || 0} MZN
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleToggleBlock(user.kp_id)}
                    color={user.status === 'BLOCKED' ? 'success' : 'error'}
                  >
                    {user.status === 'BLOCKED' ? <CheckCircle /> : <Block />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="caption" color="textSecondary">
          Total: {pagination.total} utilizadores
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            Anterior
          </Button>
          <Typography variant="body2" sx={{ alignSelf: 'center' }}>
            Página {pagination.page} de {pagination.pages}
          </Typography>
          <Button
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Próxima
          </Button>
        </Box>
      </Box>
    </Layout>
  )
}

export default Users
