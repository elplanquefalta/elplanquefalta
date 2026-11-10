// Número de Libertad Financiera — cálculo puro (sin DOM). Lo usan la página y las pruebas.
const pmt = (meta, tasaMes, meses) => (meses <= 0 ? meta : Math.abs(tasaMes) < 1e-12 ? meta / meses : (meta * tasaMes) / (Math.pow(1 + tasaMes, meses) - 1));

/** gasto: gasto mensual deseado en pesos de hoy. inflacion, rendimiento y retiro en % anual. */
export function calcular({ gasto, edad, objetivo, ahorro = 0, inflacion = 4, rendimiento = 8, retiro = 4 }) {
  const anios = Math.max(objetivo - edad, 0);
  const meses = anios * 12;
  const i = inflacion / 100, r = rendimiento / 100;
  const real = (1 + r) / (1 + i) - 1; // rendimiento después de inflación
  const numeroHoy = (gasto * 12) / (retiro / 100);
  const numeroFuturo = numeroHoy * Math.pow(1 + i, anios);
  const gastoFuturo = gasto * Math.pow(1 + i, anios);
  // Aportación que sube cada año con la inflación (expresada en pesos de hoy)
  const faltaHoy = Math.max(numeroHoy - ahorro * Math.pow(1 + real, anios), 0);
  const aporteCreciente = pmt(faltaHoy, Math.pow(1 + real, 1 / 12) - 1, meses);
  // Aportación fija en pesos, que nunca sube
  const faltaFuturo = Math.max(numeroFuturo - ahorro * Math.pow(1 + r, anios), 0);
  const aporteFijo = pmt(faltaFuturo, Math.pow(1 + r, 1 / 12) - 1, meses);
  return { anios, real: real * 100, numeroHoy, numeroFuturo, gastoFuturo, aporteCreciente, aporteFijo, cubierto: faltaHoy === 0 };
}
