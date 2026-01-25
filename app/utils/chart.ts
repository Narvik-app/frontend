import {getColorByIndex} from "~/utils/colors";
import type {ChartDataset, ChartType} from "chart.js";

export interface ChartDataField {
  x: string | number,
  y?: string | number
}

export interface ChartData<TType extends ChartType = ChartType> {
  datasets: ChartDataset<TType, ChartDataField[]>[]
}

// Type of charts

export type ChartBarData = ChartData<'bar'>

export type ChartPieData = ChartData<'pie'>

export type ChartLineData = ChartData<'line'>

export type ChartRadarData = ChartData<'radar'>

export type ChartDoughnutData = ChartData<'doughnut'>

export type ChartPolarAreaData = ChartData<'polarArea'>

export type ChartBubbleData = ChartData<'bubble'>

export type ChartScatterData = ChartData<'scatter'>

export function setChartDefaultBackgroundColors(chartData: ChartData, isXY = true, propname: string = 'backgroundColor') {
  let notFoundColorIndex = 0;
  for (const key of Object.keys(chartData.datasets)) {
    const itemKey = key
    const index = Number(itemKey)
    if (isNaN(index) || chartData.datasets[index] === undefined) {
      console.error(`Invalid dataset index: ${index} - ${itemKey}`)
      continue;
    }

    const dataset = chartData.datasets[index]

    // Setting the default color
    if (dataset[propname] === undefined) {
      if (isXY) {
        dataset[propname] = getColorByIndex(notFoundColorIndex).value;
      } else {
        const numberOfColors = dataset.data.length
        const colors: string[] = []
        for (let i = 0; i < numberOfColors; i++) {
          colors.push(getColorByIndex(i).value);
        }
        dataset[propname] = colors
      }
      notFoundColorIndex++;
    }
  }
  return chartData
}
