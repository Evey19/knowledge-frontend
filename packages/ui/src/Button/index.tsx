import React from "react";
import "./styles.scss";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  type?: "primary" | "default" | "dashed" | "link";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  type = "default",
  ...rest
}) => (
  <button className={`btn btn-${type}`} {...rest}>
    {children}
  </button>
);
