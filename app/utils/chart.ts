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

export function setChartDefaultBackgroundColors(chartData: ChartData, isXY = true, propname: string = 'backgroundColor') {
  let notFoundColorIndex = 0;
  for (let itemKey of Object.keys(chartData.datasets)) {
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
