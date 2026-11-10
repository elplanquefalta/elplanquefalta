/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/herramientas/libertad/index.html', './public/herramientas/perfil/index.html'],
  theme: {
    extend: {
      colors: {
        sage: '#4A5D4C',
        sageLight: '#5E7461',
        sageDeep: '#2D382E',
        cream: '#F5F2EB',
        warmGrey: '#E8E5DC',
        gold: '#D4A853',
        softBlack: '#1A1A1A',
        darkSage: '#344136',
        error: '#CC3333',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        dmsans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
