import { NextRequest, NextResponse } from 'next/server';
import { cloudMonitoring } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/logger';

// Cloud Monitoring メトリクス定義の初期セットアップ
export async function POST(request: NextRequest) {
  try {
    logger.info('Initializing Cloud Monitoring metrics setup', 'monitoring-setup');
    
    if (!cloudMonitoring.isEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Cloud Monitoring is not enabled',
        message: 'Please check your Google Cloud credentials and permissions',
        requirements: [
          'Set GOOGLE_APPLICATION_CREDENTIALS environment variable',
          'Ensure service account has monitoring.timeSeries.create permission',
          'Grant Monitoring Metric Writer role to the service account'
        ]
      }, { status: 400 });
    }
    
    await cloudMonitoring.createMetricDescriptors();
    
    logger.info('Cloud Monitoring metrics setup completed successfully', 'monitoring-setup');
    
    return NextResponse.json({
      success: true,
      message: 'Cloud Monitoring metrics initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to initialize Cloud Monitoring metrics', 'monitoring-setup', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 現在の監視状態を確認
export async function GET(request: NextRequest) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-agent-hackathon';
    const isEnabled = cloudMonitoring.isEnabled();
    
    return NextResponse.json({
      success: true,
      monitoring: {
        enabled: isEnabled,
        projectId,
        environment: process.env.NODE_ENV,
        loggingEnabled: true,
        metricsEnabled: isEnabled,
        credentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        status: isEnabled ? 'active' : 'disabled'
      },
      endpoints: isEnabled ? {
        logs: `https://console.cloud.google.com/logs/query?project=${projectId}`,
        metrics: `https://console.cloud.google.com/monitoring?project=${projectId}`,
        customMetrics: `https://console.cloud.google.com/monitoring/metrics-explorer?project=${projectId}&pageState=%7B%22xyChart%22:%7B%22dataSets%22:%5B%7B%22timeSeriesFilter%22:%7B%22filter%22:%22resource.type%3D%5C%22global%5C%22%20AND%20metric.type%3Dstarts_with(%5C%22custom.googleapis.com/agent/%5C%22)%22%7D%7D%5D%7D%7D`
      } : null,
      troubleshooting: !isEnabled ? {
        steps: [
          '1. Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly',
          '2. Grant the following IAM role to your service account: roles/monitoring.metricWriter',
          '3. Enable the Cloud Monitoring API in your project',
          '4. Restart the application after making changes'
        ],
        gcloudCommand: `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:$(cat ${process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json'} | jq -r '.client_email')" --role="roles/monitoring.metricWriter"`
      } : null,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get monitoring status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}