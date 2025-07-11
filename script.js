

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
    this.setupEventListeners();
    this.setupTheme();
    this.setupScrollAnimations();
    this.setupSkillBars();
    this.setupFormValidation();
    this.setupSmoothScrolling();
    this.initAOS();
    
    // Add loading animation
    this.removeLoadingStates();
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

  initAOS() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 100,
        delay: 0
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
  
  // Add parallax effect to hero background
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.5;
      hero.style.transform = `translateY(${parallax}px)`;
    });
  }
  
  // Add hover effects to project cards
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
  
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
console.log('Made with ❤️ by Alex Johnson');
