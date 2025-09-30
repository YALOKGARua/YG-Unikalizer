use napi::bindgen_prelude::*;
use napi_derive::napi;
use image::{DynamicImage, GenericImageView};
use rayon::prelude::*;
use std::path::Path;

#[napi]
pub struct ImageHasher {
    width: u32,
    height: u32,
}

#[napi]
impl ImageHasher {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            width: 8,
            height: 8,
        }
    }

    #[napi]
    pub fn ahash(&self, image_path: String) -> Result<String> {
        let img = image::open(Path::new(&image_path))
            .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;
        
        let hash = self.compute_ahash(&img);
        Ok(format!("{:016x}", hash))
    }

    #[napi]
    pub fn dhash(&self, image_path: String) -> Result<String> {
        let img = image::open(Path::new(&image_path))
            .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;
        
        let hash = self.compute_dhash(&img);
        Ok(format!("{:016x}", hash))
    }

    #[napi]
    pub fn phash(&self, image_path: String) -> Result<String> {
        let img = image::open(Path::new(&image_path))
            .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;
        
        let hash = self.compute_phash(&img);
        Ok(format!("{:016x}", hash))
    }

    fn compute_ahash(&self, img: &DynamicImage) -> u64 {
        let gray = img.grayscale().resize_exact(
            self.width,
            self.height,
            image::imageops::FilterType::Lanczos3,
        );

        let pixels: Vec<u8> = gray.to_luma8().into_raw();
        let avg: u32 = pixels.iter().map(|&p| p as u32).sum::<u32>() / pixels.len() as u32;

        let mut hash = 0u64;
        for &pixel in &pixels {
            hash = (hash << 1) | if pixel as u32 >= avg { 1 } else { 0 };
        }
        hash
    }

    fn compute_dhash(&self, img: &DynamicImage) -> u64 {
        let gray = img.grayscale().resize_exact(
            self.width + 1,
            self.height,
            image::imageops::FilterType::Lanczos3,
        );

        let pixels = gray.to_luma8();
        let mut hash = 0u64;

        for y in 0..self.height {
            for x in 0..self.width {
                let left = pixels.get_pixel(x, y)[0];
                let right = pixels.get_pixel(x + 1, y)[0];
                hash = (hash << 1) | if left < right { 1 } else { 0 };
            }
        }
        hash
    }

    fn compute_phash(&self, img: &DynamicImage) -> u64 {
        let gray = img.grayscale().resize_exact(
            32,
            32,
            image::imageops::FilterType::Lanczos3,
        );

        let pixels: Vec<f64> = gray
            .to_luma8()
            .into_raw()
            .iter()
            .map(|&p| p as f64)
            .collect();

        let dct = self.dct_2d(&pixels, 32, 32);
        
        let low_freq: Vec<f64> = dct.iter().take(64).copied().collect();
        let median = self.median(&low_freq);

        let mut hash = 0u64;
        for &val in &low_freq {
            hash = (hash << 1) | if val > median { 1 } else { 0 };
        }
        hash
    }

    fn dct_2d(&self, pixels: &[f64], width: usize, height: usize) -> Vec<f64> {
        let mut result = vec![0.0; width * height];
        
        for u in 0..8 {
            for v in 0..8 {
                let mut sum = 0.0;
                for x in 0..width {
                    for y in 0..height {
                        let pixel = pixels[y * width + x];
                        let cos_x = ((2.0 * x as f64 + 1.0) * u as f64 * std::f64::consts::PI / (2.0 * width as f64)).cos();
                        let cos_y = ((2.0 * y as f64 + 1.0) * v as f64 * std::f64::consts::PI / (2.0 * height as f64)).cos();
                        sum += pixel * cos_x * cos_y;
                    }
                }
                result[v * 8 + u] = sum;
            }
        }
        result
    }

    fn median(&self, values: &[f64]) -> f64 {
        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        sorted[sorted.len() / 2]
    }
}

#[napi]
pub fn hamming_distance(hash1: String, hash2: String) -> Result<u32> {
    let h1 = u64::from_str_radix(&hash1, 16)
        .map_err(|e| Error::from_reason(format!("Invalid hash1: {}", e)))?;
    let h2 = u64::from_str_radix(&hash2, 16)
        .map_err(|e| Error::from_reason(format!("Invalid hash2: {}", e)))?;
    
    Ok((h1 ^ h2).count_ones())
}

#[napi]
pub fn batch_hash(image_paths: Vec<String>, algorithm: String) -> Result<Vec<String>> {
    let results: Vec<String> = image_paths
        .par_iter()
        .filter_map(|path| {
            let hasher = ImageHasher::new();
            match algorithm.as_str() {
                "ahash" => hasher.ahash(path.clone()).ok(),
                "dhash" => hasher.dhash(path.clone()).ok(),
                "phash" => hasher.phash(path.clone()).ok(),
                _ => None,
            }
        })
        .collect();
    
    Ok(results)
}

#[napi]
pub fn xxhash64(data: Buffer) -> String {
    use xxhash_rust::xxh3::xxh3_64;
    let hash = xxh3_64(&data);
    format!("{:016x}", hash)
}

#[napi(object)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub has_alpha: bool,
}

#[napi]
pub fn get_image_info(image_path: String) -> Result<ImageInfo> {
    let img = image::open(Path::new(&image_path))
        .map_err(|e| Error::from_reason(format!("Failed to open image: {}", e)))?;
    
    let (width, height) = img.dimensions();
    let format = match img {
        DynamicImage::ImageRgb8(_) => "RGB8",
        DynamicImage::ImageRgba8(_) => "RGBA8",
        DynamicImage::ImageLuma8(_) => "L8",
        DynamicImage::ImageLumaA8(_) => "LA8",
        _ => "Other",
    };
    
    let has_alpha = matches!(img, DynamicImage::ImageRgba8(_) | DynamicImage::ImageLumaA8(_));
    
    Ok(ImageInfo {
        width,
        height,
        format: format.to_string(),
        has_alpha,
    })
}