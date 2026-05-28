import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "standard" | "elevated" | "redFlag" | "paleMint";
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "standard",
  children,
  className = "",
  ...props
}) => {
  const variantClass =
    variant === "elevated"
      ? "card-elevated"
      : variant === "redFlag"
      ? "card-red-flag"
      : variant === "paleMint"
      ? "bg-pale-mint/40 p-5 border border-spring-leaf/30 rounded-xl"
      : "card";

  return (
    <div className={`${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
