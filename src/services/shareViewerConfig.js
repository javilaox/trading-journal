/**
 * Dirección del visor de informes compartidos.
 *
 * La publica el desarrollador UNA vez (ver scripts/build-share-viewer.js) y se inyecta en el
 * build con webpack.DefinePlugin, igual que las credenciales de Supabase. Así el cliente final
 * genera el enlace y ya está: no tiene que configurar ni alojar nada.
 */
const shareViewerUrl = process.env.SHARE_VIEWER_URL || '';

module.exports = { shareViewerUrl };
