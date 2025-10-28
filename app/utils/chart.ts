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

export interface ChartBarData extends ChartData<'bar'> { }

export interface ChartPieData extends ChartData<'pie'> { }

export interface ChartLineData extends ChartData<'line'> { }

export interface ChartRadarData extends ChartData<'radar'> { }

export interface ChartDoughnutData extends ChartData<'doughnut'> { }

export interface ChartPolarAreaData extends ChartData<'polarArea'> { }

export interface ChartBubbleData extends ChartData<'bubble'> { }

export interface ChartScatterData extends ChartData<'scatter'> { }

export function setChartDefaultBackgroundColors(chartData: ChartData) {
  let notFoundColorIndex = 0;
  for (let itemKey of Object.keys(chartData.datasets)) {
    const index = Number(itemKey)
    if (isNaN(index) || chartData.datasets[index] === undefined) {
      console.error(`Invalid dataset index: ${index} - ${itemKey}`)
      continue;
    }

    // Setting the default color
    if (chartData.datasets[index].backgroundColor === undefined ) {
      chartData.datasets[index].backgroundColor = getColorByIndex(notFoundColorIndex).value;
      notFoundColorIndex++;
    }
  }
  return chartData
}
