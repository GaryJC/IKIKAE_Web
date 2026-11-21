"use client";

import { useEffect, useRef, useState } from "react";

export default function RevealOnScroll({
    as: Element = "div",
    children,
    className = "",
    delay = 0,
    direction = "up",
    once = true,
    ...props
}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.unobserve(entry.target);
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            {
                rootMargin: "0px 0px -12% 0px",
                threshold: 0.12,
            }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [once]);

    return (
        <Element
            ref={ref}
            data-reveal={direction}
            className={`reveal-on-scroll ${isVisible ? "is-visible" : ""} ${className}`}
            style={{ "--reveal-delay": `${delay}ms` }}
            {...props}
        >
            {children}
        </Element>
    );
}
