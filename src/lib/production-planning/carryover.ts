import { addDays, type Forecast } from "./forecast";

/** Deduct a physical, saleable count at this outlet, not old deliveries or planned kitchen retention.
 * Keep the exact net amount (including odd quantities) so pair rounding cannot undo the stock offset.
 * Event quantities are added by the caller afterwards and remain protected.
 */
export function applyOutletCarryover(forecast: Forecast, date: string, stock: {recordId: string; quantity: unknown} | null): void {
  const value=stock?.quantity;
  const available=value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=1_000_000?Number(value):null;
  const gross=forecast.suggested;
  const deducted=available===null||gross===null?0:Math.min(available,gross);
  forecast.carryover={date:addDays(date,-1),recordId:stock?.recordId??null,available,deducted,gross,minimum:forecast.minimum,status:available===null?"missing":"confirmed"};
  if(available===null||gross===null)return;
  forecast.suggested=Math.max(0,gross-deducted);
  if(forecast.minimum!==null)forecast.minimum=Math.max(0,forecast.minimum-available);
  if(forecast.reductionFloor!==null)forecast.reductionFloor=Math.max(0,forecast.reductionFloor-available);
  if(forecast.employee){forecast.employee.capacity=forecast.suggested;forecast.employee.extra=0;forecast.employee.oddException=forecast.suggested%2!==0;}
}
