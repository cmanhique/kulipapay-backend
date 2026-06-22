import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'

const StatsCard = ({ title, value, icon, color, subtitle }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography color="textSecondary" variant="caption" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ color, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default StatsCard
