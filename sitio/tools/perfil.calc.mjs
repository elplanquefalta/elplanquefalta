// Perfil de inversor — preguntas, perfiles y cálculo (sin DOM).
export const PREGUNTAS = [
  { t: "¿Cuál es tu principal objetivo al invertir?", o: ["Proteger mi dinero contra la inflación", "Crecimiento moderado sin sustos", "Equilibrio entre crecimiento y estabilidad", "Crecimiento significativo de mi capital", "Maximizar rendimientos sin importar el riesgo"] },
  { t: "Si tu inversión perdiera valor temporalmente, ¿qué tan cómodo estarías?", o: ["Muy incómodo, no podría dormir", "Incómodo, vendería parte", "Lo aceptaría pero preocupado", "Cómodo, mantendría la posición", "Muy cómodo, lo vería como oportunidad"] },
  { t: "¿Cuál es tu horizonte de inversión?", o: ["Menos de 1 año", "Entre 1 y 3 años", "Entre 3 y 5 años", "Entre 5 y 10 años", "Más de 10 años"] },
  { t: "Si tu inversión cayera 10% en un mes, ¿qué harías?", o: ["Retiraría todo mi dinero", "Retiraría una parte importante", "No haría nada, esperaría", "Invertiría un poco más", "Invertiría significativamente más"] },
  { t: "¿Qué porcentaje de tus ingresos puedes destinar a invertir?", o: ["Menos del 5%", "Entre 5% y 10%", "Entre 10% y 20%", "Entre 20% y 30%", "Más del 30%"] },
  { t: "Sobre inversiones de alto riesgo y alto rendimiento, tú dirías:", o: ["Las evito completamente", "Solo una pequeña parte de mi capital", "Las considero ocasionalmente", "Forman parte importante de mi estrategia", "Son mi enfoque principal"] },
  { t: "¿Qué tan importante es tener acceso rápido a tu dinero?", o: ["Necesito acceso inmediato", "Acceso en pocas semanas", "Acceso en algunos meses está bien", "Puedo esperar 1 o 2 años", "No me importa la liquidez"] },
  { t: "¿Qué tan familiarizado estás con instrumentos financieros?", o: ["Me parecen muy complicados", "Sé poco pero quiero aprender", "Tengo un conocimiento básico", "Conozco varios productos y los he usado", "Los entiendo bien y me emocionan"] },
];
const HORIZONTE = 2, LIQUIDEZ = 6;

// mezcla: [clase de activo, %]. Mezclas ilustrativas, no una recomendación personalizada.
export const PERFILES = [
  { id: "conservador", nombre: "Conservador", min: 8, desc: "Tu prioridad es cuidar tu capital. Prefieres rendimientos predecibles, aunque sean modestos, antes que ver caer tu dinero.",
    mezcla: [["Deuda de corto plazo (CETES, fondos de deuda)", 80], ["Deuda ligada a inflación (Udibonos)", 15], ["Renta variable global (ETFs)", 5]] },
  { id: "moderado", nombre: "Moderado", min: 17, desc: "Buscas ganarle a la inflación con sustos controlados. Aceptas algo de sube y baja a cambio de crecer un poco más.",
    mezcla: [["Deuda de corto plazo (CETES, fondos de deuda)", 45], ["Deuda ligada a inflación (Udibonos)", 25], ["Renta variable global (ETFs)", 25], ["FIBRAs", 5]] },
  { id: "crecimiento", nombre: "Crecimiento", min: 25, desc: "Aceptas caídas temporales porque tu dinero tiene años para recuperarse. Te interesa más crecer que dormir sin sobresaltos.",
    mezcla: [["Deuda de corto plazo (CETES, fondos de deuda)", 20], ["Deuda ligada a inflación (Udibonos)", 15], ["Renta variable global (ETFs)", 50], ["Renta variable México", 10], ["FIBRAs", 5]] },
  { id: "agresivo", nombre: "Agresivo", min: 33, desc: "Buscas el mayor crecimiento posible y toleras caídas fuertes. Tu plazo largo y tu experiencia te permiten aguantarlas sin vender.",
    mezcla: [["Deuda de corto plazo (CETES, fondos de deuda)", 10], ["Deuda ligada a inflación (Udibonos)", 5], ["Renta variable global (ETFs)", 60], ["Renta variable México", 15], ["FIBRAs", 10]] },
];

/** respuestas: arreglo de 8 números del 1 al 5. Devuelve el perfil; lo limita si el plazo o la liquidez no dan para más riesgo. */
export function resultado(respuestas) {
  const total = respuestas.reduce((a, b) => a + b, 0);
  let idx = 0;
  PERFILES.forEach((p, i) => { if (total >= p.min) idx = i; });
  let tope = 3, motivo = "";
  const h = respuestas[HORIZONTE], l = respuestas[LIQUIDEZ];
  if (h === 1) { tope = 0; motivo = "Tu plazo es menor a un año: con ese horizonte no conviene tomar riesgo, aunque lo toleres."; }
  else if (h === 2) { tope = 1; motivo = "Tu plazo es de 1 a 3 años: es poco tiempo para recuperarte de una caída fuerte."; }
  else if (h === 3) { tope = 2; motivo = "Tu plazo es de 3 a 5 años: todavía corto para una mezcla agresiva."; }
  if (l === 1 && tope > 1) { tope = 1; motivo = "Necesitas acceso inmediato a tu dinero: eso limita cuánto puedes tener en renta variable."; }
  const limitado = idx > tope;
  return { total, perfil: PERFILES[limitado ? tope : idx], porPuntos: PERFILES[idx], limitado, motivo: limitado ? motivo : "" };
}
