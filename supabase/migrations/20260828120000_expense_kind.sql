-- Tipo de gasto: qué clase de gasto es, no solo a qué prop pertenece.
--
-- Hasta ahora todo gasto se registraba contra una prop y un tamaño de cuenta, porque el
-- formulario no permitía otra cosa. Con esto se pueden apuntar también formaciones, herramientas
-- y demás, que no tienen ni prop ni tamaño: en esos gastos esos dos campos se guardan vacíos.
--
-- Valores: 'prop', 'formacion', 'herramientas', 'otros'.
--
-- El valor por defecto es 'prop' y NO es casual: las filas que ya existen se quedan sin valor y
-- se leen como gastos de prop, que es exactamente lo que son. Así ningún total, ningún desglose
-- por prop y ningún balance cambia al actualizar.
--
-- Aditiva y con valor por defecto: una versión antigua de la aplicación sigue funcionando contra
-- esta tabla sin enterarse de que la columna existe.

alter table public.real_account_expenses
  add column if not exists expense_kind text not null default 'prop';

comment on column public.real_account_expenses.expense_kind is
  'Tipo de gasto: prop | formacion | herramientas | otros. Solo los de tipo prop llevan account_name y account_size.';

notify pgrst, 'reload schema';
