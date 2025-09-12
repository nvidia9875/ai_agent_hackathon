'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
// Note: For now using regular text inputs, will need to install @mui/x-date-pickers for proper date/time pickers

const circumstances = [
  'Escaped from yard/home',
  'Lost during walk',
  'Ran away scared',
  'Left gate/door open',
  'Car accident/escape',
  'Other'
];

export default function LastSeenForm() {
  const [formData, setFormData] = useState({
    lastSeenDate: '',
    lastSeenTime: '',
    location: '',
    address: '',
    circumstances: '',
    description: ''
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<any>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  return (
    <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white', border: '1px solid', borderColor: 'grey.200' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Last Seen Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        When and where was your pet last seen? This helps our AI focus the search area.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Seen Date"
            type="date"
            value={formData.lastSeenDate}
            onChange={handleChange('lastSeenDate')}
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Seen Time"
            type="time"
            value={formData.lastSeenTime}
            onChange={handleChange('lastSeenTime')}
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Specific Location"
              value={formData.location}
              onChange={handleChange('location')}
              variant="outlined"
              placeholder="e.g. Dog park, neighborhood street, backyard"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'grey.50'
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address or Area"
              value={formData.address}
              onChange={handleChange('address')}
              variant="outlined"
              placeholder="Street address or general area (e.g. Main St & 5th Ave, Downtown area)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'grey.50'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>How did they go missing?</InputLabel>
              <Select
                value={formData.circumstances}
                onChange={handleChange('circumstances')}
                input={<OutlinedInput label="How did they go missing?" />}
                sx={{ backgroundColor: 'grey.50' }}
              >
                {circumstances.map((circumstance) => (
                  <MenuItem key={circumstance} value={circumstance}>
                    {circumstance}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Details"
              value={formData.description}
              onChange={handleChange('description')}
              variant="outlined"
              multiline
              rows={3}
              placeholder="Any other details about when/how your pet went missing, behavior at the time, weather conditions, etc."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'grey.50'
                }
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'success.50', borderRadius: 2 }}>
          <Typography variant="body2" color="success.main" fontWeight="500">
            📍 Our Search Coordinator AI will use this information to deploy resources in the most likely areas and predict movement patterns.
          </Typography>
        </Box>
      </Paper>
  );
}