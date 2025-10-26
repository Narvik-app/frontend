import type {ChartData as ChartJsData} from "chart.js";

export interface ChartData {
  x: string|number,
  y?: string|number
}

// Type of charts

export interface ChartBarData extends ChartJsData<'bar', ChartData[]> { }

export interface ChartPieData extends ChartJsData<'pie', ChartData[]> { }

export interface ChartLineData extends ChartJsData<'line', ChartData[]> { }

export interface ChartRadarData extends ChartJsData<'radar', ChartData[]> { }

export interface ChartDoughnutData extends ChartJsData<'doughnut', ChartData[]> { }

export interface ChartPolarAreaData extends ChartJsData<'polarArea', ChartData[]> { }

export interface ChartBubbleData extends ChartJsData<'bubble', ChartData[]> { }

export interface ChartScatterData extends ChartJsData<'scatter', ChartData[]> { }
