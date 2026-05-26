

class PortfolioApp {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.hamburger = document.getElementById('hamburger');
    this.navMenu = document.getElementById('nav-menu');
    this.themeToggle = document.getElementById('theme-toggle');
    this.contactForm = document.getElementById('contact-form');
    
    this.currentTheme = localStorage.getItem('theme') || 'light';
    
    this.init();
  }

  init() {
    this.setupPageEntrance();
    this.setupEventListeners();
    this.setupTheme();
    this.setupScrollAnimations();
    this.setupSkillBars();
    this.setupFormValidation();
    this.setupSmoothScrolling();
    this.initAOS();
    this.setupParallax();
    this.setupTiltEffect();
    this.setupMagneticEffect();
    this.setupCustomCursor();
    this.setupLightbox();
  }

  setupPageEntrance() {
    const loader = document.getElementById('loader');
    const loaderBar = document.querySelector('.loader-bar');
    const loaderStatus = document.querySelector('.loader-status');
    const loaderPercentage = document.querySelector('.loader-percentage');

    const statuses = [
      'INITIALIZING SYSTEM...',
      'LOADING ASSETS...',
      'COMPILING SCRIPTS...',
      'READYING PORTFOLIO...',
      'OPTIMIZING INTERFACE...',
      'SYSTEM READY'
    ];

    // Simulate loading progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress > 100) progress = 100;

      const currentProgress = Math.floor(progress);

      if (loaderBar) loaderBar.style.width = `${currentProgress}%`;
      if (loaderPercentage) loaderPercentage.textContent = `${currentProgress}%`;

      // Update status text based on progress
      if (loaderStatus) {
        const statusIndex = Math.floor((currentProgress / 100) * (statuses.length - 1));
        if (loaderStatus.textContent !== statuses[statusIndex]) {
          loaderStatus.textContent = statuses[statusIndex];
        }
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          loader?.classList.add('loaded');
          // Trigger AOS refresh after loader is gone
          setTimeout(() => {
            if (typeof AOS !== 'undefined') AOS.refresh();
          }, 600);
        }, 500);
      }
    }, 50);
  }

  setupEventListeners() {
    // Scroll event for navbar
    window.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Mobile menu toggle
    this.hamburger?.addEventListener('click', this.toggleMobileMenu.bind(this));
    
    // Theme toggle
    this.themeToggle?.addEventListener('click', this.toggleTheme.bind(this));
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', this.handleNavClick.bind(this));
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.navMenu?.contains(e.target) && !this.hamburger?.contains(e.target)) {
        this.closeMobileMenu();
      }
    });
    
    // Form submission
    this.contactForm?.addEventListener('submit', this.handleFormSubmit.bind(this));
    
    // Intersection Observer for nav link highlighting
    this.setupIntersectionObserver();
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleScroll() {
    const scrolled = window.scrollY > 50;
    this.navbar?.classList.toggle('scrolled', scrolled);
    
    // Update scroll progress
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    
    // You can use this for a progress bar if needed
    document.documentElement.style.setProperty('--scroll-progress', `${scrollPercent}%`);
  }

  toggleMobileMenu() {
    this.hamburger?.classList.toggle('active');
    this.navMenu?.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = this.navMenu?.classList.contains('active') ? 'hidden' : '';
  }

  closeMobileMenu() {
    this.hamburger?.classList.remove('active');
    this.navMenu?.classList.remove('active');
    document.body.style.overflow = '';
  }

  handleNavClick(e) {
    const href = e.target.getAttribute('href');
    
    if (href?.startsWith('#')) {
      e.preventDefault();
      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const offsetTop = targetElement.offsetTop - (this.navbar?.offsetHeight || 0);
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        
        this.closeMobileMenu();
      }
    }
  }

  setupIntersectionObserver() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Remove active class from all nav links
          navLinks.forEach(link => link.classList.remove('active'));
          
          // Add active class to current nav link
          const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          activeLink?.classList.add('active');
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-100px 0px -100px 0px'
    });
    
    sections.forEach(section => observer.observe(section));
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeToggle();
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
    this.updateThemeToggle();
    
    // Add a subtle animation effect
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }

  updateThemeToggle() {
    const sunIcon = this.themeToggle?.querySelector('.fa-sun');
    const moonIcon = this.themeToggle?.querySelector('.fa-moon');
    
    if (this.currentTheme === 'dark') {
      sunIcon?.style.setProperty('opacity', '0.5');
      moonIcon?.style.setProperty('opacity', '1');
    } else {
      sunIcon?.style.setProperty('opacity', '1');
      moonIcon?.style.setProperty('opacity', '0.5');
    }
  }

  setupScrollAnimations() {
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    animateElements.forEach(el => observer.observe(el));
  }

  setupSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const progressBar = entry.target;
          const width = progressBar.getAttribute('data-width');
          
          // Animate the progress bar
          setTimeout(() => {
            progressBar.style.width = width;
          }, 200);
          
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5
    });
    
    skillBars.forEach(bar => observer.observe(bar));
  }

  setupFormValidation() {
    if (!this.contactForm) return;
    
    const inputs = this.contactForm.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.getAttribute('name');
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    this.clearFieldError(field);
    
    switch (fieldName) {
      case 'name':
        if (value.length < 2) {
          isValid = false;
          errorMessage = 'Name must be at least 2 characters long';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
        break;
      case 'subject':
        if (value.length < 5) {
          isValid = false;
          errorMessage = 'Subject must be at least 5 characters long';
        }
        break;
      case 'message':
        if (value.length < 10) {
          isValid = false;
          errorMessage = 'Message must be at least 10 characters long';
        }
        break;
    }
    
    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }
    
    return isValid;
  }

  showFieldError(field, message) {
    field.style.borderColor = '#ef4444';
    
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
      errorElement = document.createElement('span');
      errorElement.className = 'field-error';
      errorElement.style.cssText = `
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
      `;
      field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
  }

  clearFieldError(field) {
    field.style.borderColor = '';
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this.contactForm);
    const inputs = this.contactForm.querySelectorAll('input, textarea');
    let isFormValid = true;
    
    // Validate all fields
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });
    
    if (!isFormValid) {
      this.showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    // Show loading state
    const submitButton = this.contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;
    
    try {
      // Note: Replace with your actual Formspree endpoint
      const response = await fetch(this.contactForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        this.showNotification('Message sent successfully! I\'ll get back to you soon.', 'success');
        this.contactForm.reset();
        
        // Clear floating labels
        inputs.forEach(input => {
          input.dispatchEvent(new Event('blur'));
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showNotification('Failed to send message. Please try again or contact me directly.', 'error');
    } finally {
      // Restore button state
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.25rem;
      margin-left: auto;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    const timeoutId = setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
      clearTimeout(timeoutId);
      this.removeNotification(notification);
    });
  }

  removeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }

  setupSmoothScrolling() {
    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
          const offsetTop = target.offsetTop - (this.navbar?.offsetHeight || 0);
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  setupCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.cursor-follower');
    const links = document.querySelectorAll('a, button, .theme-toggle, .project-card');

    if (!cursor || !follower) return;

    window.addEventListener('mousemove', (e) => {
      const { clientX: x, clientY: y } = e;

      // Update main cursor immediately
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';

      // Follower with slight lag (handled by CSS transition or RAF)
      follower.style.left = x + 'px';
      follower.style.top = y + 'px';
    });

    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        cursor.classList.add('cursor-hover');
        follower.classList.add('cursor-hover');
      });
      link.addEventListener('mouseleave', () => {
        cursor.classList.remove('cursor-hover');
        follower.classList.remove('cursor-hover');
      });
    });
  }

  setupLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    const projectCards = document.querySelectorAll('.project-card');

    let currentImages = [];
    let currentIndex = 0;

    if (!modal || !lightboxImg) return;

    const updateLightboxImage = () => {
      lightboxImg.style.opacity = '0';
      setTimeout(() => {
        lightboxImg.src = currentImages[currentIndex];
        lightboxImg.style.opacity = '1';
      }, 200);

      // Show/Hide nav buttons based on image count
      const showNav = currentImages.length > 1;
      prevBtn.style.display = showNav ? 'flex' : 'none';
      nextBtn.style.display = showNav ? 'flex' : 'none';
    };

    projectCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-link')) return;

        // Find all images in the card
        const cardImages = Array.from(card.querySelectorAll('img')).map(img => img.src);

        if (cardImages.length > 0) {
          currentImages = cardImages;
          currentIndex = 0;
          updateLightboxImage();

          // Add Title and Description to Lightbox
          const title = card.querySelector('.project-title').textContent;
          const desc = card.querySelector('.project-description').textContent;
          document.getElementById('lightbox-title').textContent = title;
          document.getElementById('lightbox-desc').textContent = desc;

          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    const nextImage = () => {
      currentIndex = (currentIndex + 1) % currentImages.length;
      updateLightboxImage();
    };

    const prevImage = () => {
      currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      updateLightboxImage();
    };

    nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
    prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => { lightboxImg.src = ''; currentImages = []; }, 300);
    };

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight' && currentImages.length > 1) nextImage();
      if (e.key === 'ArrowLeft' && currentImages.length > 1) prevImage();
    });
  }

  setupParallax() {
    const parallaxShapes = document.querySelectorAll('.parallax-shape');
    const heroContent = document.querySelector('.hero-content');
    const outlineTexts = document.querySelectorAll('.section-outline-text');
    const heroSection = document.querySelector('.hero');

    // Mouse movement parallax for hero background
    if (heroSection) {
      heroSection.addEventListener('mousemove', (e) => {
        const { clientX: x, clientY: y } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const moveX = (x - centerX) / 50;
        const moveY = (y - centerY) / 50;

        parallaxShapes.forEach(shape => {
          const speed = parseFloat(shape.getAttribute('data-speed')) || 0.1;
          shape.style.transform = `translate(${moveX * speed * 20}px, ${moveY * speed * 20}px) translateY(${window.scrollY * speed}px)`;
        });
      });
    }

    const updateParallax = () => {
      const scrollY = window.scrollY;

      // Parallax for Hero text
      if (heroContent) {
        const speed = parseFloat(heroContent.getAttribute('data-speed')) || 0.3;
        heroContent.style.transform = `translateY(${scrollY * speed}px)`;
        heroContent.style.opacity = 1 - (scrollY / 800);
      }

      // Horizontal scroll for outline texts with varying speeds
      outlineTexts.forEach((text, index) => {
        const rect = text.parentElement.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const direction = index % 2 === 0 ? 1 : -1;
          const moveX = (window.innerHeight - rect.top) * 0.15 * direction;
          text.style.transform = `translate(calc(-50% + ${moveX}px), -50%) skewX(${moveX * 0.02}deg)`;
        }
      });

      requestAnimationFrame(updateParallax);
    };

    requestAnimationFrame(updateParallax);
  }

  setupTiltEffect() {
    // 1. Special Handling for Hero Card (uses container for max stability)
    const heroContainer = document.querySelector('.hero-visual');
    const heroCard = document.querySelector('.floating-card');

    if (heroContainer && heroCard) {
      heroContainer.addEventListener('mousemove', (e) => {
        const rect = heroContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (centerY - y) / 10;
        const rotateY = (x - centerX) / 10;

        heroCard.style.transition = 'none'; // Disable transition during mouse move
        heroCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
      });

      heroContainer.addEventListener('mouseleave', () => {
        heroCard.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
        heroCard.style.transform = 'rotateX(10deg) rotateY(-10deg) scale3d(1, 1, 1)';
      });
    }

    // 2. Generic Tilt for other elements
    const otherCards = document.querySelectorAll('.project-card, .skill-category, .image-container');

    otherCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (centerY - y) / 20;
        const rotateY = (x - centerX) / 20;

        card.style.transition = 'none';
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02) translateY(-5px)`;

        if (card.classList.contains('project-card')) {
          const lightX = (x / rect.width) * 100;
          const lightY = (y / rect.height) * 100;
          card.style.backgroundImage = `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255,255,255,0.05) 0%, transparent 80%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
        card.style.transform = '';
        card.style.backgroundImage = '';
      });
    });
  }



  setupMagneticEffect() {
    const magneticElements = document.querySelectorAll('.btn, .social-link, .nav-logo');

    magneticElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = `translate(0px, 0px)`;
      });
    });
  }

  initAOS() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 1000,
        easing: 'ease-out-expo',
        once: true,
        offset: 50,
        delay: 0,
        anchorPlacement: 'top-bottom'
      });
    }
  }

  handleKeydown(e) {
    // Handle keyboard navigation
    if (e.key === 'Escape') {
      this.closeMobileMenu();
      
      // Close any open notifications
      const notification = document.querySelector('.notification');
      if (notification) {
        this.removeNotification(notification);
      }
    }
    
    // Tab navigation for accessibility
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  }

  removeLoadingStates() {
    // Remove loading classes after initial load
    setTimeout(() => {
      document.querySelectorAll('.loading').forEach(el => {
        el.classList.remove('loading');
      });
    }, 1000);
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PortfolioApp();
});

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
  // Add typing animation to hero section
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    // Add cursor blink animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      .typing-cursor {
        animation: blink 1s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // Add click animation to buttons
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      `;
      
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
  
  // Add the ripple animation
  if (!document.querySelector('#ripple-animation')) {
    const rippleStyle = document.createElement('style');
    rippleStyle.id = 'ripple-animation';
    rippleStyle.textContent = `
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(rippleStyle);
  }
});

// Performance optimization: Lazy load images
document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('loading');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    images.forEach(img => {
      img.src = img.dataset.src;
    });
  }
});

console.log('🚀 Portfolio website loaded successfully!');
console.log('Made with ❤️ by Van Jasper Benzon');
