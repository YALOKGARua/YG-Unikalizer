(module
 (type $0 (func))
 (type $1 (func (param i32 i32) (result i32)))
 (type $2 (func (param i32 i32 i32) (result i32)))
 (memory $0 0)
 (export "init" (func $wasm/assembly/index/init))
 (export "add" (func $wasm/assembly/index/add))
 (export "luminance" (func $wasm/assembly/index/luminance))
 (export "memory" (memory $0))
 (func $wasm/assembly/index/init
 )
 (func $wasm/assembly/index/add (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  i32.add
 )
 (func $wasm/assembly/index/luminance (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  local.get $0
  i32.const 299
  i32.mul
  local.get $1
  i32.const 587
  i32.mul
  i32.add
  local.get $2
  i32.const 114
  i32.mul
  i32.add
  i32.const 1000
  i32.div_s
 )
)
