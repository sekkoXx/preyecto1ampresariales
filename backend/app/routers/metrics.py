from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from datetime import datetime

from . import models
from .database import get_db
from .auth import get_current_user
from .products import require_seller_or_admin

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/sales-chart", response_model=List[Dict])
def get_sales_chart_data(db: Session = Depends(get_db), user: models.Usuario = Depends(require_seller_or_admin)):
    # Returns sales total grouped by date (ignoring time)
    # Using python to group since sqlite string dates need parsing
    sales = db.query(models.Venta).all()
    
    daily_sales = {}
    for sale in sales:
        try:
            # sale.fecha format is like '2026-04-11T20:38:26.123456'
            date_obj = datetime.fromisoformat(sale.fecha)
            date_str = date_obj.strftime("%Y-%m-%d")
        except ValueError:
            date_str = sale.fecha.split("T")[0] # fallback

        if date_str not in daily_sales:
            daily_sales[date_str] = 0.0
        daily_sales[date_str] += sale.total

    # Sort by date
    sorted_sales = [{"date": k, "total": v} for k, v in sorted(daily_sales.items())]
    return sorted_sales
