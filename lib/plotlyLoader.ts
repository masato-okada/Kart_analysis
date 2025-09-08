// Plotly.jsの動的ローダー
let plotlyPromise: Promise<any> | null = null;

export const loadPlotly = () => {
  if (plotlyPromise) {
    return plotlyPromise;
  }

  plotlyPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Plotly can only be loaded in the browser'));
      return;
    }

    import('plotly.js/dist/plotly.min.js')
      .then((plotly) => {
        resolve(plotly);
      })
      .catch((error) => {
        console.error('Failed to load Plotly:', error);
        reject(error);
      });
  });

  return plotlyPromise;
};
