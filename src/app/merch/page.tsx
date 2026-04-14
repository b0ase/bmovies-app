'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { 
  ShoppingBagIcon, 
  HeartIcon,
  StarIcon,
  TruckIcon,
  ShieldCheckIcon,
  GiftIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

export default function MerchPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSize, setSelectedSize] = useState('')

  const categories = [
    { id: 'all', name: 'All Products', count: 89 },
    { id: 'apparel', name: 'Punk Apparel', count: 34 },
    { id: 'accessories', name: 'Ninja Gear', count: 23 },
    { id: 'posters', name: 'Art & Posters', count: 18 },
    { id: 'tech', name: 'Cyber Accessories', count: 12 },
    { id: 'collectibles', name: 'Limited Editions', count: 2 }
  ]

  const products = [
    {
      id: 1,
      name: 'Storm Razorclaw Shadow Walker Hoodie',
      image: '/npgx-images/characters/storm-razorclaw-1.jpg',
      price: '$79.99',
      originalPrice: '$99.99',
      rating: 4.9,
      reviews: 234,
      category: 'apparel',
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Shadow Black', 'Neon Pink', 'Cyber Purple', 'Blood Red'],
      bestseller: true,
      discount: 20,
      character: 'Storm Razorclaw'
    },
    {
      id: 2,
      name: 'Vega Darkfire Ghost Rider Poster',
      image: '/npgx-images/heroes/hero-1.jpg',
      price: '$34.99',
      originalPrice: '$44.99',
      rating: 5.0,
      reviews: 156,
      category: 'posters',
      sizes: ['12x18', '18x24', '24x36'],
      colors: [],
      bestseller: false,
      discount: 22,
      character: 'Vega Darkfire'
    },
    {
      id: 3,
      name: 'Echo Nightfall Neon Assassin Tee',
      image: '/npgx-images/heroes/hero-2.jpg',
      price: '$49.99',
      originalPrice: '$59.99',
      rating: 4.8,
      reviews: 189,
      category: 'apparel',
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Neon Black', 'Electric Blue', 'Cyber Green', 'Hot Pink'],
      bestseller: true,
      discount: 17,
      character: 'Echo Nightfall'
    },
    {
      id: 4,
      name: 'Luna Cyberblade Tech Phone Case',
      image: '/npgx-images/characters/nova-bloodmoon-1.jpg',
      price: '$29.99',
      originalPrice: '$39.99',
      rating: 4.7,
      reviews: 98,
      category: 'tech',
      sizes: ['iPhone 15', 'iPhone 14', 'Samsung Galaxy'],
      colors: ['Holographic', 'Neon Black', 'Cyber Pink'],
      bestseller: false,
      discount: 25,
      character: 'Luna Cyberblade'
    },
    {
      id: 5,
      name: 'Nova Bloodmoon Apocalypse Canvas',
      image: '/npgx-images/characters/raven-shadowblade-1.jpg',
      price: '$129.99',
      originalPrice: '$179.99',
      rating: 5.0,
      reviews: 67,
      category: 'posters',
      sizes: ['16x20', '20x24', '24x30'],
      colors: [],
      bestseller: true,
      discount: 28,
      character: 'Nova Bloodmoon'
    },
    {
      id: 6,
      name: 'NPGX Rebellion Snapback',
      image: '/npgx-images/characters/phoenix-darkfire-1.jpg',
      price: '$44.99',
      originalPrice: '$54.99',
      rating: 4.6,
      reviews: 145,
      category: 'accessories',
      sizes: ['One Size'],
      colors: ['Anarchy Black', 'Neon Pink', 'Cyber Purple', 'Blood Red'],
      bestseller: false,
      discount: 18,
      character: 'NPGX Brand'
    },
    {
      id: 7,
      name: 'Raven Shadowblade Gothic Mug',
      image: '/npgx-images/heroes/hero-3.jpg',
      price: '$24.99',
      originalPrice: '$32.99',
      rating: 4.8,
      reviews: 89,
      category: 'accessories',
      sizes: ['11oz', '15oz'],
      colors: ['Gothic Black', 'Blood Red'],
      bestseller: true,
      discount: 24,
      character: 'Raven Shadowblade'
    },
    {
      id: 8,
      name: 'Limited Edition NPGX Collectible Cards',
      image: '/npgx-images/gallery/gallery-1.jpg',
      price: '$299.99',
      originalPrice: '$399.99',
      rating: 5.0,
      reviews: 23,
      category: 'collectibles',
      sizes: [],
      colors: [],
      bestseller: false,
      discount: 25,
      limited: true,
      character: 'NPGX Collection'
    }
  ]

  const features = [
    {
      icon: <TruckIcon className="h-6 w-6" />,
      title: "Free Shipping",
      description: "On orders over $75"
    },
    {
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      title: "Quality Guarantee",
      description: "30-day money back"
    },
    {
      icon: <GiftIcon className="h-6 w-6" />,
      title: "Gift Cards",
      description: "Perfect for rebels"
    }
  ]

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="bg-black/80 border-t border-white/10 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-bold text-white mb-6"
          >
            NPGX <span className="text-red-500">MERCHANDISE</span> ⚡
          </motion.h1>
          <p className="text-xl text-gray-300 mb-8 opacity-90 max-w-3xl mx-auto">
            Represent the rebellion with exclusive NPGX merchandise featuring your favorite Ninja Punk Girls
          </p>
          
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 mb-8 max-w-4xl mx-auto border border-red-500/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-400">89+</div>
                <div className="text-gray-300 text-sm">Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">15K+</div>
                <div className="text-gray-300 text-sm">Rebels Worldwide</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">4.9★</div>
                <div className="text-gray-300 text-sm">Average Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">24/7</div>
                <div className="text-gray-300 text-sm">Support</div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-black/50 text-gray-300 hover:bg-red-600/20 border border-red-500/30'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-700"
              >
                {/* Product Image */}
                <div className="relative h-64 bg-gray-700">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.bestseller && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      🔥 Bestseller
                    </div>
                  )}
                  {product.limited && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      ⚡ Limited
                    </div>
                  )}
                  {product.discount && (
                    <div className="absolute bottom-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      -{product.discount}%
                    </div>
                  )}
                  <button className="absolute bottom-4 right-4 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full transition-colors">
                    <HeartIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <div className="text-sm text-red-400 font-semibold mb-2">
                    {product.character}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center mb-3">
                    <div className="flex text-gray-400">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating) ? 'fill-current' : ''
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400 text-sm ml-2">
                      ({product.reviews})
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold text-white">
                        {product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-gray-500 line-through ml-2">
                          {product.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Size Selection */}
                  {product.sizes.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Size
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              selectedSize === size
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <button className="w-full bg-gradient-to-r from-red-600 to-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-red-700 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-2">
                    <ShoppingBagIcon className="h-5 w-5" />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Choose NPGX Merch?
            </h2>
            <p className="text-gray-400 text-lg">
              Premium quality merchandise for the ultimate rebellion
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 bg-gray-700 rounded-xl"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-600 rounded-lg mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black/60 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Join the NPGX Rebellion
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Get exclusive access to limited edition merchandise and be part of the revolution
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-red-600 text-white px-8 py-4 rounded-full text-xl font-semibold hover:bg-red-700 transition-colors">
              Shop Now ⚡
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-xl font-semibold hover:bg-white hover:text-red-900 transition-colors">
              View Collection 🔥
            </button>
          </div>
        </div>
      </section>
    </div>
  )
} 