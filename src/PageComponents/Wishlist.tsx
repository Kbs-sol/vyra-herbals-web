'use client';

import React from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { FaHeart } from 'react-icons/fa';
import { IoMdHome } from 'react-icons/io';

import { useWishlist } from '@/Components/Contexts/WishlistContext';
import { useAuth } from '@/Components/Contexts/AuthContext';
import SEOComponent from '@/Components/Shared/SEOComponent';
import ProductCard2 from '@/Components/Shared/ProductCard2';

const Wishlist = () => {
    const { wishlistItems, wishlistCount } = useWishlist();
    const { user, loading: authLoading } = useAuth();

    // Wait for auth to finish initialising before deciding what to render —
    // otherwise a logged-in user briefly sees the "please login" prompt on a
    // direct/cold page load (user is null until the session is restored).
    if (authLoading) {
        return (
            <StyledWishlist>
                <SEOComponent title="Wishlist" description="View your wishlist" />
                <section className="wishlist-section py-5">
                    <div className="container">
                        <div className="text-center py-5">
                            <div className="spinner-border text-secondary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </section>
            </StyledWishlist>
        );
    }

    if (!user) {
        return (
            <StyledWishlist>
                <SEOComponent title="Wishlist" description="View your wishlist" />
                <section className="bredcum_out">
                    <div className="container">
                        <div className="breadcrumbs">
                            <ul className="items d-flex">
                                <li className="item home">
                                    <Link href="/" title="Go to Home Page">
                                        <IoMdHome />
                                    </Link>
                                </li>
                                <li>/</li>
                                <li className="item cms_page">
                                    <strong>Wishlist</strong>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="wishlist-section py-5">
                    <div className="container">
                        <div className="empty-wishlist text-center py-5">
                            <FaHeart className="empty-icon" />
                            <h3>Please login to view your wishlist</h3>
                            <p>Login to save your favorite products and access them anytime.</p>
                            <Link href="/login" className="btn btn-primary mt-3">
                                Login Now
                            </Link>
                        </div>
                    </div>
                </section>
            </StyledWishlist>
        );
    }

    return (
        <StyledWishlist>
            <SEOComponent title="Wishlist" description="View your wishlist items" />

            <section className="bredcum_out">
                <div className="container">
                    <div className="breadcrumbs">
                        <ul className="items d-flex">
                            <li className="item home">
                                <Link href="/" title="Go to Home Page">
                                    <IoMdHome />
                                </Link>
                            </li>
                            <li>/</li>
                            <li className="item cms_page">
                                <strong>Wishlist</strong>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="wishlist-section py-4">
                <div className="container">
                    <div className="section-header mb-4">
                        <h2>
                            <FaHeart className="me-2" style={{ color: '#e74c3c' }} />
                            My Wishlist ({wishlistCount})
                        </h2>
                    </div>

                    {wishlistCount === 0 ? (
                        <div className="empty-wishlist text-center py-5">
                            <FaHeart className="empty-icon" />
                            <h3>Your wishlist is empty</h3>
                            <p>Start adding your favorite products to your wishlist!</p>
                            <Link href="/search?searchtext=all" className="btn btn-primary mt-3">
                                Browse Products
                            </Link>
                        </div>
                    ) : (
                        <div className="row row-cols-1 row-cols-md-1 row-cols-lg-2 row-cols-xl-2">
                            {wishlistItems.map((product) => (
                                <ProductCard2 key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </StyledWishlist>
    );
};

export default Wishlist;

const StyledWishlist = styled.div`
  .section-header {
    h2 {
      display: flex;
      align-items: center;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
    }
  }

  .empty-wishlist {
    .empty-icon {
      font-size: 4rem;
      color: #e74c3c;
      opacity: 0.3;
      margin-bottom: 1rem;
    }
    
    h3 {
      color: var(--text);
      margin-bottom: 0.5rem;
    }
    
    p {
      color: #666;
      margin-bottom: 1rem;
    }

    .btn-primary {
      background: var(--primary);
      border-color: var(--primary);
      padding: 10px 24px;
      
      &:hover {
        background: var(--primary-dark);
        border-color: var(--primary-dark);
      }
    }
  }

  .wishlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .wishlist-item {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    
    &:hover {
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      transform: translateY(-4px);
    }

    .product-image {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      
      &:hover img {
        transform: scale(1.05);
      }
    }

    .product-details {
      padding: 1rem;

      .product-title {
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        line-height: 1.4;
        
        a {
          color: var(--text);
          text-decoration: none;
          
          &:hover {
            color: var(--primary);
          }
        }
      }

      .product-price {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;

        .current-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text);
        }

        .original-price {
          font-size: 0.9rem;
          color: #999;
          text-decoration: line-through;
        }

        .discount {
          font-size: 0.85rem;
          color: #27ae60;
          font-weight: 600;
        }
      }

      .product-actions {
        display: flex;
        gap: 0.5rem;

        .btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          font-size: 0.9rem;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          
          &:hover {
            background: var(--primary-dark);
            border-color: var(--primary-dark);
          }
        }

        .btn-outline-success {
          flex: 1;
        }

        .btn-outline-danger {
          flex: 0 0 auto;
          width: 40px;
          padding: 8px;
        }
      }
    }
  }

  @media (max-width: 576px) {
    .wishlist-grid {
      grid-template-columns: 1fr;
    }

    .wishlist-item {
      .product-details {
        .product-actions {
          flex-wrap: wrap;
          
          .btn-primary,
          .btn-outline-success {
            flex: 1 1 calc(100% - 50px);
          }
        }
      }
    }
  }
`;
