'use client';

import { useState } from 'react';
import { Box, Tab, Tabs, Paper } from '@mui/material';
import BehaviorPredictorMap from './BehaviorPredictorMap';
import BehaviorPredictorPanel from './BehaviorPredictorPanel';
import type { PredictionResult } from '@/lib/types/behavior-predictor';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`behavior-tabpanel-${index}`}
      aria-labelledby={`behavior-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function BehaviorPredictorContainer() {
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<number>(3);
  const [visualizationSettings, setVisualizationSettings] = useState({
    showHeatmap: true,
    showDangerZones: true,
    showPointsOfInterest: true,
  });
  const [tabValue, setTabValue] = useState(0);

  const handlePredictionUpdate = (result: PredictionResult | null) => {
    setPredictionResult(result);
    // Switch to map view when prediction is generated
    if (result) {
      setTabValue(0);
    }
  };

  const handleTimeFrameChange = (hours: number) => {
    setSelectedTimeFrame(hours);
  };

  const handleVisualizationSettingsChange = (settings: any) => {
    setVisualizationSettings(settings);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="behavior predictor tabs"
          sx={{ minHeight: 48 }}
        >
          <Tab label="予測マップ" />
          <Tab label="設定・分析" />
        </Tabs>
      </Paper>
      
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <BehaviorPredictorMap
            predictionResult={predictionResult}
            showHeatmap={visualizationSettings.showHeatmap}
            showDangerZones={visualizationSettings.showDangerZones}
            showPointsOfInterest={visualizationSettings.showPointsOfInterest}
            selectedTimeFrame={selectedTimeFrame}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <BehaviorPredictorPanel
            onPredictionUpdate={handlePredictionUpdate}
            onTimeFrameChange={handleTimeFrameChange}
            onVisualizationSettingsChange={handleVisualizationSettingsChange}
          />
        </TabPanel>
      </Box>
    </Box>
  );
}