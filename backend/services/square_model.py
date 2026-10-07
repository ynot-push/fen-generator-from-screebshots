import torch.nn as nn


class Block(nn.Module):
    def __init__(self, cin, cout, stride):
        super().__init__()
        self.c1 = nn.Conv2d(cin, cout, 3, stride, 1, bias=False)
        self.b1 = nn.BatchNorm2d(cout)
        self.c2 = nn.Conv2d(cout, cout, 3, 1, 1, bias=False)
        self.b2 = nn.BatchNorm2d(cout)
        self.act = nn.ReLU(inplace=True)
        self.short = None
        if stride != 1 or cin != cout:
            self.short = nn.Sequential(nn.Conv2d(cin, cout, 1, stride, bias=False), nn.BatchNorm2d(cout))

    def forward(self, x):
        y = self.act(self.b1(self.c1(x)))
        y = self.b2(self.c2(y))
        return self.act(y + (x if self.short is None else self.short(x)))


class SquareNet(nn.Module):
    def __init__(self, n_classes=13):
        super().__init__()

        self.stem = nn.Sequential(nn.Conv2d(1, 24, 3, 1, 1, bias=False), nn.BatchNorm2d(24), nn.ReLU(inplace=True))
        self.body = nn.Sequential(
            Block(24,48,2),     # 32x32
            Block(48,96, 2),     # 16x16
            Block(96,192, 2),    # 8x8
            Block(192,192,1),
        )
        self.pool = nn.AdaptiveAvgPool2d(2)
        self.head = nn.Sequential(nn.Flatten(), nn.Dropout(0.25), nn.Linear(192 * 4, n_classes))

    def forward(self, x):
        return self.head(self.pool(self.body(self.stem(x))))
