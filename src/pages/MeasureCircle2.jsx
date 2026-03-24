// Second circle measurement (post-fatigue tremor)
// Re-uses MeasureCircle logic via redirect flag
// We render the same circle component but mark it as post-fatigue
// by reading the URL. MeasureCircle checks window.location.href for 'MeasureCircle2'
export { default } from './MeasureCircle';
