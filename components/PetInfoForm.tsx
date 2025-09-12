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
  Chip,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';

const petTypes = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const dogBreeds = ['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle', 'Mixed Breed', 'Other'];
const catBreeds = ['Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Mixed Breed', 'Other'];
const colors = ['Black', 'White', 'Brown', 'Golden', 'Gray', 'Orange', 'Spotted', 'Mixed'];
const sizes = ['Small (0-25 lbs)', 'Medium (26-60 lbs)', 'Large (61-100 lbs)', 'Extra Large (100+ lbs)'];

export default function PetInfoForm() {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    age: '',
    size: '',
    colors: [] as string[],
    specialFeatures: '',
    microchipId: ''
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<any>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleColorChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setFormData(prev => ({
      ...prev,
      colors: value
    }));
  };

  const getBreedOptions = () => {
    if (formData.type === 'Dog') return dogBreeds;
    if (formData.type === 'Cat') return catBreeds;
    return ['N/A'];
  };

  return (
    <Paper elevation={0} sx={{ p: 4, backgroundColor: 'white', border: '1px solid', borderColor: 'grey.200' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Pet Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tell us about your missing pet to help our AI search more effectively.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Pet's Name"
            value={formData.name}
            onChange={handleChange('name')}
            variant="outlined"
            placeholder="e.g. Max, Luna, Charlie"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Pet Type</InputLabel>
            <Select
              value={formData.type}
              onChange={handleChange('type')}
              input={<OutlinedInput label="Pet Type" />}
              sx={{ backgroundColor: 'grey.50' }}
            >
              {petTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={!formData.type || formData.type === 'Other'}>
            <InputLabel>Breed</InputLabel>
            <Select
              value={formData.breed}
              onChange={handleChange('breed')}
              input={<OutlinedInput label="Breed" />}
              sx={{ backgroundColor: 'grey.50' }}
            >
              {getBreedOptions().map((breed) => (
                <MenuItem key={breed} value={breed}>
                  {breed}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Age"
            value={formData.age}
            onChange={handleChange('age')}
            variant="outlined"
            placeholder="e.g. 2 years, 6 months"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Size</InputLabel>
            <Select
              value={formData.size}
              onChange={handleChange('size')}
              input={<OutlinedInput label="Size" />}
              sx={{ backgroundColor: 'grey.50' }}
            >
              {sizes.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Colors</InputLabel>
            <Select
              multiple
              value={formData.colors}
              onChange={handleColorChange}
              input={<OutlinedInput label="Colors" />}
              sx={{ backgroundColor: 'grey.50' }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {colors.map((color) => (
                <MenuItem key={color} value={color}>
                  {color}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Special Features or Markings"
            value={formData.specialFeatures}
            onChange={handleChange('specialFeatures')}
            variant="outlined"
            multiline
            rows={3}
            placeholder="Describe any unique markings, scars, collar details, or distinctive features..."
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
            label="Microchip ID (Optional)"
            value={formData.microchipId}
            onChange={handleChange('microchipId')}
            variant="outlined"
            placeholder="15-digit microchip number"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, p: 2, backgroundColor: 'info.50', borderRadius: 2 }}>
        <Typography variant="body2" color="info.main" fontWeight="500">
          🤖 Our AI uses this information to create a detailed search profile and identify potential matches more accurately.
        </Typography>
      </Box>
    </Paper>
  );
}