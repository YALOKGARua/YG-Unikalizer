export function init(): void {}
export function add(a: i32, b: i32): i32 { return a + b }
export function luminance(r: i32, g: i32, b: i32): i32 { return (r * 299 + g * 587 + b * 114) / 1000 }