const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('./supabaseConfig');

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
